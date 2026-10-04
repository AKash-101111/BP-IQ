import os
import sys
import shutil
import random
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from ultralytics import YOLO

def download_item(item):
    split_name, fpath, dest_img_dir, dest_lbl_dir = item
    fname = Path(fpath).name
    stem = Path(fpath).stem
    img_dest = dest_img_dir / fname
    lbl_dest = dest_lbl_dir / f"{stem}.txt"

    if img_dest.exists() and lbl_dest.exists() and img_dest.stat().st_size > 1000:
        return True

    raw_img_url = f"https://huggingface.co/datasets/v1nz/cubicasa5k-yolo/resolve/main/{fpath}"
    lbl_fpath = f"labels/train/{stem}.txt"
    raw_lbl_url = f"https://huggingface.co/datasets/v1nz/cubicasa5k-yolo/raw/main/{lbl_fpath}"

    try:
        r_img = requests.get(raw_img_url, timeout=30)
        r_lbl = requests.get(raw_lbl_url, timeout=30)

        if r_img.status_code == 200 and r_lbl.status_code == 200 and len(r_img.content) > 1000:
            with open(img_dest, "wb") as f:
                f.write(r_img.content)

            bbox_lines = []
            for line in r_lbl.text.strip().split("\n"):
                parts = line.strip().split()
                if len(parts) >= 5:
                    cls_id = int(parts[0])
                    if cls_id in [0, 1, 2]:
                        coords = [float(p) for p in parts[1:]]
                        xs = coords[0::2]
                        ys = coords[1::2]
                        min_x, max_x = max(0.0, min(xs)), min(1.0, max(xs))
                        min_y, max_y = max(0.0, min(ys)), min(1.0, max(ys))
                        w = max_x - min_x
                        h = max_y - min_y
                        if w > 0.001 and h > 0.001:
                            xc = min_x + w / 2.0
                            yc = min_y + h / 2.0
                            bbox_lines.append(f"{cls_id} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}")

            with open(lbl_dest, "w") as f:
                f.write("\n".join(bbox_lines))

            return True
    except Exception as e:
        print(f"Warning: error downloading {fname}: {e}", flush=True)
    return False

def main():
    print("=" * 60, flush=True)
    print("BLUEPRINTIQ: REAL ARCHITECTURAL YOLO11n FINE-TUNING PIPELINE", flush=True)
    print("=" * 60, flush=True)

    base_model_path = r"C:\Users\naray\Downloads\yolo11n.pt"
    if not os.path.exists(base_model_path):
        print(f"ERROR: Base pretrained model not found at {base_model_path}", flush=True)
        sys.exit(1)

    print(f"Base Pretrained Model Verified: {base_model_path}", flush=True)

    dataset_root = Path(r"C:\Users\naray\BP-IQ\backend\datasets\cubicasa_yolo")
    images_dir = dataset_root / "images"
    labels_dir = dataset_root / "labels"

    for split in ["train", "val", "test"]:
        (images_dir / split).mkdir(parents=True, exist_ok=True)
        (labels_dir / split).mkdir(parents=True, exist_ok=True)

    print("\n1. Fetching authentic architectural drawings index from CubiCasa5K...", flush=True)
    tree_url = "https://huggingface.co/api/datasets/v1nz/cubicasa5k-yolo/tree/main/images/train"
    resp = requests.get(tree_url, timeout=30)
    if resp.status_code != 200:
        print(f"ERROR: Failed to fetch dataset tree: {resp.status_code}", flush=True)
        sys.exit(1)

    all_files = [f["path"] for f in resp.json() if f.get("path", "").endswith(".png")]
    print(f"Found {len(all_files)} authentic architectural floor plans available.", flush=True)

    random.seed(42)
    selected_files = random.sample(all_files, min(250, len(all_files)))
    total_count = len(selected_files)

    train_count = int(total_count * 0.70)
    val_count = int(total_count * 0.20)
    test_count = total_count - train_count - val_count

    splits = {
        "train": selected_files[:train_count],
        "val": selected_files[train_count:train_count + val_count],
        "test": selected_files[train_count + val_count:]
    }

    print(f"\n2. Downloading and formatting dataset with exact 70/20/10 split (Parallel threads):", flush=True)
    print(f"   - Training images:   {len(splits['train'])} (70%)", flush=True)
    print(f"   - Validation images: {len(splits['val'])} (20%)", flush=True)
    print(f"   - Test images:       {len(splits['test'])} (10%)", flush=True)

    tasks = []
    for split_name, file_list in splits.items():
        for fpath in file_list:
            tasks.append((split_name, fpath, images_dir / split_name, labels_dir / split_name))

    success = 0
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(download_item, t) for t in tasks]
        for f in as_completed(futures):
            if f.result():
                success += 1

    train_images = list((images_dir / "train").glob("*.png"))
    val_images = list((images_dir / "val").glob("*.png"))
    test_images = list((images_dir / "test").glob("*.png"))

    print(f"\n3. Dataset Download & Verification Complete:", flush=True)
    print(f"   - Verified Train: {len(train_images)} images, {len(list((labels_dir / 'train').glob('*.txt')))} labels", flush=True)
    print(f"   - Verified Val:   {len(val_images)} images, {len(list((labels_dir / 'val').glob('*.txt')))} labels", flush=True)
    print(f"   - Verified Test:  {len(test_images)} images, {len(list((labels_dir / 'test').glob('*.txt')))} labels", flush=True)

    data_yaml_path = dataset_root / "data.yaml"
    yaml_content = f"""path: {dataset_root.as_posix()}
train: images/train
val: images/val
test: images/test
names:
  0: wall
  1: door
  2: window
"""
    with open(data_yaml_path, "w") as f:
        f.write(yaml_content)

    print(f"\n4. YAML configuration written to: {data_yaml_path}", flush=True)

    print(f"\n5. Loading pretrained base weights: {base_model_path}", flush=True)
    model = YOLO(base_model_path)

    runs_dir = Path(r"C:\Users\naray\BP-IQ\backend\runs_yolo")
    print(f"\n6. Starting fine-tuning with parameters:", flush=True)
    print(f"   - Image Size: 640", flush=True)
    print(f"   - Max Epochs: 50", flush=True)
    print(f"   - Patience (Early Stopping): 10", flush=True)
    print(f"   - Optimizer: Auto / AdamW", flush=True)
    print(f"   - Runs Directory: {runs_dir}", flush=True)

    results = model.train(
        data=str(data_yaml_path),
        epochs=50,
        patience=10,
        imgsz=640,
        batch=16,
        project=str(runs_dir),
        name="yolo11n_cubicasa_architectural",
        exist_ok=True,
        verbose=True
    )

    print("\n7. Evaluating trained model on TEST set...", flush=True)
    best_weights_path = runs_dir / "yolo11n_cubicasa_architectural" / "weights" / "best.pt"
    if not best_weights_path.exists():
        best_weights_path = runs_dir / "yolo11n_cubicasa_architectural" / "weights" / "last.pt"

    trained_model = YOLO(str(best_weights_path))
    val_results = trained_model.val(data=str(data_yaml_path), split="test", imgsz=640)

    target_best_pt = Path(r"C:\Users\naray\BP-IQ\backend\app\models\best.pt")
    target_best_pt.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(str(best_weights_path), str(target_best_pt))

    print(f"\n8. Saved validated best model to: {target_best_pt}", flush=True)
    print(f"   Model file size: {target_best_pt.stat().st_size} bytes", flush=True)

    print("\n" + "=" * 60, flush=True)
    print("TRAINING & VALIDATION COMPLETE", flush=True)
    print("=" * 60, flush=True)

if __name__ == "__main__":
    main()
